"""
sentinel_processing.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: Satellite Data Ingestion & Preprocessing (Sentinel-1 SAR + Sentinel-2 Optical)

Purpose
-------
Pulls Sentinel-1 (SAR, all-weather) and Sentinel-2 (optical, 10m) imagery
for a given farm polygon via Google Earth Engine, computes vegetation
indices (NDVI/EVI/SAVI) and SAR backscatter statistics, and writes the
resulting time-series to a tabular format ready for ingestion into
Timestream / PostgreSQL.

Requirements
------------
    pip install earthengine-api geopandas rasterio numpy pandas --break-system-packages

Auth
----
    earthengine authenticate   # one-time interactive OAuth, or use a service account

Usage
-----
    python sentinel_processing.py --geojson farm_boundary.geojson \
        --start 2024-06-01 --end 2024-11-30 --out farm_indices.csv
========================================================================
"""

import argparse
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import ee
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Earth Engine initialization
# --------------------------------------------------------------------------
def init_earth_engine(service_account: Optional[str] = None, key_path: Optional[str] = None) -> None:
    """
    Initialize the Earth Engine session.

    In production, use a service account (no interactive login) so this
    can run inside an Airflow worker / Lambda container.
    """
    try:
        if service_account and key_path:
            credentials = ee.ServiceAccountCredentials(service_account, key_path)
            ee.Initialize(credentials)
            logger.info("Earth Engine initialized with service account: %s", service_account)
        else:
            ee.Initialize()
            logger.info("Earth Engine initialized with cached user credentials.")
    except Exception as exc:
        raise RuntimeError(
            "Earth Engine initialization failed. Run `earthengine authenticate` "
            "or supply a service account + key file."
        ) from exc


@dataclass
class FarmPolygon:
    """Lightweight wrapper for a farm boundary."""
    farm_id: str
    geojson_geometry: dict  # GeoJSON Polygon/MultiPolygon geometry dict

    def to_ee_geometry(self) -> ee.Geometry:
        return ee.Geometry(self.geojson_geometry)


# --------------------------------------------------------------------------
# Sentinel-2 Optical: NDVI / EVI / SAVI
# --------------------------------------------------------------------------
def mask_s2_clouds(image: ee.Image) -> ee.Image:
    """Mask clouds/cirrus using the Sentinel-2 QA60 band."""
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask).divide(10000).copyProperties(image, ["system:time_start"])


def compute_vegetation_indices(image: ee.Image) -> ee.Image:
    """Compute NDVI, EVI, SAVI bands and append to the image."""
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")

    evi = image.expression(
        "2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))",
        {"NIR": image.select("B8"), "RED": image.select("B4"), "BLUE": image.select("B2")},
    ).rename("EVI")

    # Soil Adjusted Vegetation Index, L=0.5 standard soil-brightness correction factor
    savi = image.expression(
        "((NIR - RED) / (NIR + RED + 0.5)) * 1.5",
        {"NIR": image.select("B8"), "RED": image.select("B4")},
    ).rename("SAVI")

    return image.addBands([ndvi, evi, savi])


def get_sentinel2_timeseries(
    geometry: ee.Geometry, start_date: str, end_date: str, scale: int = 10
) -> pd.DataFrame:
    """
    Returns a per-date DataFrame of mean NDVI/EVI/SAVI over the farm polygon.
    """
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
        .map(mask_s2_clouds)
        .map(compute_vegetation_indices)
    )

    def reduce_image(image):
        stats = image.select(["NDVI", "EVI", "SAVI"]).reduceRegion(
            reducer=ee.Reducer.mean(), geometry=geometry, scale=scale, maxPixels=1e9
        )
        return ee.Feature(None, stats).set("date", image.date().format("YYYY-MM-dd"))

    features = collection.map(reduce_image).filter(ee.Filter.notNull(["NDVI"]))
    feature_list = features.getInfo()["features"]

    records = [f["properties"] for f in feature_list]
    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
        df["source"] = "Sentinel-2"
    return df


# --------------------------------------------------------------------------
# Sentinel-1 SAR: backscatter (cloud-penetrating, monsoon-safe)
# --------------------------------------------------------------------------
def get_sentinel1_timeseries(
    geometry: ee.Geometry, start_date: str, end_date: str, scale: int = 10
) -> pd.DataFrame:
    """
    Returns a per-date DataFrame of mean VV/VH backscatter (dB) over the farm
    polygon. SAR penetrates cloud cover, making it the primary signal during
    Kharif monsoon season (June-October) when optical imagery is unusable.
    """
    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select(["VV", "VH"])
    )

    def add_ratio(image):
        ratio = image.select("VV").divide(image.select("VH")).rename("VV_VH_ratio")
        return image.addBands(ratio)

    collection = collection.map(add_ratio)

    def reduce_image(image):
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=geometry, scale=scale, maxPixels=1e9
        )
        return ee.Feature(None, stats).set("date", image.date().format("YYYY-MM-dd"))

    features = collection.map(reduce_image).filter(ee.Filter.notNull(["VV"]))
    feature_list = features.getInfo()["features"]

    records = [f["properties"] for f in feature_list]
    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
        df["source"] = "Sentinel-1"
    return df


# --------------------------------------------------------------------------
# Fusion: merge optical + SAR into a single daily-resampled feature table
# --------------------------------------------------------------------------
def fuse_optical_sar(s2_df: pd.DataFrame, s1_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merges Sentinel-2 vegetation indices and Sentinel-1 backscatter into a
    single time-indexed table, forward-filling gaps caused by cloud cover
    (this is exactly why SAR matters: it fills the gaps optical leaves
    during monsoon).
    """
    s2 = s2_df.drop(columns=["source"], errors="ignore").set_index("date") if not s2_df.empty else pd.DataFrame()
    s1 = s1_df.drop(columns=["source"], errors="ignore").set_index("date") if not s1_df.empty else pd.DataFrame()

    merged = s2.join(s1, how="outer", lsuffix="_s2", rsuffix="_s1")
    merged = merged.sort_index().ffill(limit=5)  # forward-fill short gaps only
    merged = merged.reset_index()
    return merged


# --------------------------------------------------------------------------
# CLI entry point
# --------------------------------------------------------------------------
def process_farm(farm: FarmPolygon, start_date: str, end_date: str) -> pd.DataFrame:
    geometry = farm.to_ee_geometry()
    logger.info("Fetching Sentinel-2 optical series for farm %s", farm.farm_id)
    s2_df = get_sentinel2_timeseries(geometry, start_date, end_date)
    logger.info("Fetching Sentinel-1 SAR series for farm %s", farm.farm_id)
    s1_df = get_sentinel1_timeseries(geometry, start_date, end_date)
    fused = fuse_optical_sar(s2_df, s1_df)
    fused["farm_id"] = farm.farm_id
    return fused


def main():
    parser = argparse.ArgumentParser(description="Sentinel-1/2 ingestion + index computation")
    parser.add_argument("--geojson", required=True, help="Path to farm boundary GeoJSON file")
    parser.add_argument("--farm-id", default="farm_001")
    parser.add_argument("--start", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="YYYY-MM-DD")
    parser.add_argument("--out", default="farm_indices.csv")
    parser.add_argument("--service-account", default=None)
    parser.add_argument("--key-path", default=None)
    args = parser.parse_args()

    import json
    with open(args.geojson) as f:
        geom = json.load(f)
        if geom.get("type") == "FeatureCollection":
            geom = geom["features"][0]["geometry"]
        elif geom.get("type") == "Feature":
            geom = geom["geometry"]

    init_earth_engine(args.service_account, args.key_path)
    farm = FarmPolygon(farm_id=args.farm_id, geojson_geometry=geom)
    df = process_farm(farm, args.start, args.end)
    df.to_csv(args.out, index=False)
    logger.info("Wrote %d rows to %s", len(df), args.out)


if __name__ == "__main__":
    main()
