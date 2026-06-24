"""
train_on_public_data.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: "Day 1 Ready" Bootstrap Training Pipeline (no PJTAU data yet)

PROBLEM
-------
The pilot must demonstrate a working system before PJTAU field data
(outbreak logs, labeled local photos, calibrated PoP-linked thresholds)
exists. This script documents and orchestrates the 3-stage bootstrap
strategy so each model has a defensible "Day 1" starting point, and a
clear, automatic upgrade path once real data arrives.

STAGE 1 — Historical Backtesting (Model 1: Spatio-Temporal Transformer)
    Source: Google Earth Engine, Sentinel-1/2, 5 years history, ~100+
            known Telangana field coordinates (use publicly digitized
            village/FPO boundaries or hand-picked sample points as a
            starting set; refine once PJTAU supplies real GeoJSON).
    Output: Self-supervised forecaster learns "normal" seasonal curves.
    Confidence: HIGH — this is real Telangana signal, not synthetic.

STAGE 2 — Transfer Learning (Model 3: ViT) + Heuristic Cold-Start (Model 2: TFT)
    Source:
      - ViT: PlantVillage (54k labeled leaf images, 38 classes) +
        TERRA-REF (maize/cotton stress imagery) for visual pretraining.
      - TFT: NO valid public time-series pest-outbreak dataset exists
        that matches Telangana conditions. Do NOT claim PlantVillage
        pretrains the TFT — it cannot (it has no temporal/weather
        structure). Instead, cold-start the TFT on heuristic labels
        derived from published agronomic thresholds (ICAR/PJTAU PoP
        literature), clearly flagged as low-confidence priors.
    Confidence: MEDIUM (ViT) / LOW (TFT) until Stage 3.

STAGE 3 — PJTAU Fine-Tuning (continuous, post field-data arrival)
    Source: PJTAU historical outbreak logs, real farm GeoJSON
            boundaries, field-staff-labeled photos from the feedback
            loop (Sprint 7).
    Action: Periodic retraining job (see retrain_pipeline() below),
            triggered on a schedule or once N new labeled samples
            accumulate in S3.
    Confidence: Rises toward the >90% targets over the pilot as this
    data accumulates — this is fine-tuning, not training from zero.

Run order
---------
    python train_on_public_data.py --stage 1   # backtesting
    python train_on_public_data.py --stage 2   # transfer learning + cold start
    python train_on_public_data.py --stage 3 --pjtau-data /path/to/pjtau_export  # once available
========================================================================
"""

import argparse
import logging
import os
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def stage1_historical_backtesting(geojson_dir: str, start: str = "2019-01-01", end: str = "2024-12-31",
                                   out_csv: str = "telangana_historical_indices.csv"):
    from sentinel_processing import init_earth_engine, FarmPolygon, process_farm
    import json

    init_earth_engine()
    all_dfs = []
    geojson_files = list(Path(geojson_dir).glob("*.geojson"))
    if not geojson_files:
        logger.warning("No GeoJSON files found in %s — supply at least sample KVK/FPO boundaries.", geojson_dir)
        return None

    for gj_path in geojson_files:
        with open(gj_path) as f:
            geom = json.load(f)
            if geom.get("type") == "FeatureCollection":
                geom = geom["features"][0]["geometry"]
            elif geom.get("type") == "Feature":
                geom = geom["geometry"]
        farm = FarmPolygon(farm_id=gj_path.stem, geojson_geometry=geom)
        try:
            df = process_farm(farm, start, end)
            all_dfs.append(df)
            logger.info("Processed %s: %d rows", farm.farm_id, len(df))
        except Exception as exc:
            logger.error("Failed to process %s: %s", farm.farm_id, exc)

    if not all_dfs:
        return None

    combined = pd.concat(all_dfs, ignore_index=True)
    combined.to_csv(out_csv, index=False)
    logger.info("Saved combined historical dataset: %s (%d rows)", out_csv, len(combined))

    from spatio_temporal_transformer import train_anomaly_model, STConfig
    split_date = pd.Timestamp(end) - pd.Timedelta(days=180)
    combined["date"] = pd.to_datetime(combined["date"])
    train_df = combined[combined["date"] < split_date]
    val_df = combined[combined["date"] >= split_date]

    model = train_anomaly_model(train_df, val_df, cfg=STConfig(), max_epochs=50,
                                 ckpt_path="anomaly_model_stage1.ckpt")
    logger.info("Stage 1 complete: anomaly_model_stage1.ckpt")
    return model


def stage2_transfer_learning(plantvillage_dir: str):
    from vision_transformer import train_vit, export_to_tflite, ViTConfig

    cfg = ViTConfig(epochs_head_only=5, epochs_finetune=10)
    logger.info("Stage 2a: fine-tuning ViT on PlantVillage public dataset...")
    train_vit(plantvillage_dir, cfg)
    export_to_tflite("vit_best.pt", cfg, tflite_path="vit_model_stage2.tflite")
    logger.info("Stage 2a complete: vit_model_stage2.tflite ready for Flutter app bundling.")

    logger.info("Stage 2b: cold-starting TFT on heuristic agronomic-rule labels "
                "(NOT on PlantVillage — see module docstring for why).")
    from temporal_fusion_transformer import (
        TFTConfig, PestRiskDataset, PestRiskTFT, heuristic_pest_labels,
    )
    import numpy as np
    import pytorch_lightning as pl
    from torch.utils.data import DataLoader

    rng = np.random.default_rng(11)
    n = 5000
    df = pd.DataFrame({
        "farm_id": rng.integers(0, 50, n).astype(str),
        "date": pd.date_range("2021-06-01", periods=n, freq="D")[:n],
        "crop_type": rng.choice(["cotton", "paddy", "maize"], n),
        "crop_stage_encoded": rng.integers(0, 5, n),
        "humidity": rng.uniform(40, 95, n),
        "temperature": rng.uniform(20, 38, n),
        "rainfall_mm": rng.exponential(5, n),
        "day_of_season": rng.integers(0, 120, n),
        "anomaly_score": rng.uniform(0, 100, n),
    })
    df["pest_label"] = heuristic_pest_labels(df)

    cfg_tft = TFTConfig()
    ds = PestRiskDataset(df, cfg_tft)
    loader = DataLoader(ds, batch_size=32, shuffle=True)
    model = PestRiskTFT(cfg_tft, n_input_features=len(cfg_tft.time_varying_known + cfg_tft.time_varying_unknown))
    trainer = pl.Trainer(max_epochs=10, accelerator="auto")
    trainer.fit(model, loader)
    trainer.save_checkpoint("tft_model_stage2_coldstart.ckpt")
    logger.info("Stage 2b complete: tft_model_stage2_coldstart.ckpt "
                "(LOW confidence — gate behind Knowledge Graph rules until Stage 3).")


def stage3_pjtau_finetune(pjtau_data_dir: str):
    geojson_dir = os.path.join(pjtau_data_dir, "farm_boundaries")
    if os.path.isdir(geojson_dir):
        logger.info("Re-running Stage 1 against real PJTAU farm boundaries...")
        stage1_historical_backtesting(geojson_dir, out_csv="telangana_pjtau_real_indices.csv")

    outbreak_csv = os.path.join(pjtau_data_dir, "outbreak_logs.csv")
    if os.path.exists(outbreak_csv):
        logger.info("Fine-tuning TFT on real PJTAU outbreak logs: %s", outbreak_csv)
        from temporal_fusion_transformer import TFTConfig, PestRiskDataset, PestRiskTFT
        import pytorch_lightning as pl
        from torch.utils.data import DataLoader

        real_df = pd.read_csv(outbreak_csv, parse_dates=["date"])
        cfg = TFTConfig()
        ds = PestRiskDataset(real_df, cfg, label_col="confirmed_pest")
        loader = DataLoader(ds, batch_size=32, shuffle=True)

        model = PestRiskTFT.load_from_checkpoint(
            "tft_model_stage2_coldstart.ckpt",
            cfg=cfg, n_input_features=len(cfg.time_varying_known + cfg.time_varying_unknown),
        )
        model.cfg.lr = 1e-4
        trainer = pl.Trainer(max_epochs=20, accelerator="auto")
        trainer.fit(model, loader)
        trainer.save_checkpoint("tft_model_stage3_pjtau_finetuned.ckpt")
        logger.info("Stage 3 TFT fine-tune complete: tft_model_stage3_pjtau_finetuned.ckpt")

    photos_dir = os.path.join(pjtau_data_dir, "field_photos")
    if os.path.isdir(photos_dir):
        logger.info("Fine-tuning ViT on real field-labeled photos: %s", photos_dir)
        from vision_transformer import train_vit, export_to_tflite, ViTConfig
        cfg = ViTConfig(epochs_head_only=2, epochs_finetune=8, lr=1e-5)
        train_vit(photos_dir, cfg)
        export_to_tflite("vit_best.pt", cfg, tflite_path="vit_model_stage3_pjtau.tflite")
        logger.info("Stage 3 ViT fine-tune complete: vit_model_stage3_pjtau.tflite")

    logger.info("Stage 3 complete. Recommend re-running validation metrics "
                "(precision/recall/AUC) against a held-out PJTAU test split before promoting to production.")


def retrain_pipeline(s3_new_samples_prefix: str, min_new_samples: int = 200):
    """
    Intended to run as a scheduled Airflow DAG / Lambda. Checks how many
    new labeled samples have landed in S3 since the last retrain, and
    triggers stage3_pjtau_finetune() once the threshold is met. Wire the
    boto3 S3-listing logic into the real Airflow DAG implementation.
    """
    raise NotImplementedError(
        "Wire this to an Airflow DAG with an S3 sensor (boto3 list_objects_v2) "
        "counting new keys under s3_new_samples_prefix since last successful run, "
        "then call stage3_pjtau_finetune() once min_new_samples is exceeded."
    )


def main():
    parser = argparse.ArgumentParser(description="Day-1-Ready bootstrap training pipeline")
    parser.add_argument("--stage", type=int, choices=[1, 2, 3], required=True)
    parser.add_argument("--geojson-dir", default="data/telangana_sample_boundaries")
    parser.add_argument("--plantvillage-dir", default="data/plantvillage")
    parser.add_argument("--pjtau-data", default=None)
    args = parser.parse_args()

    if args.stage == 1:
        stage1_historical_backtesting(args.geojson_dir)
    elif args.stage == 2:
        stage2_transfer_learning(args.plantvillage_dir)
    elif args.stage == 3:
        if not args.pjtau_data:
            raise ValueError("--pjtau-data is required for stage 3")
        stage3_pjtau_finetune(args.pjtau_data)


if __name__ == "__main__":
    main()
