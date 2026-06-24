"""
spatio_temporal_transformer.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: Model 1 — Spatio-Temporal Transformer (Anomaly Detection)

Purpose
-------
Learns the normal seasonal growth curve of a crop (NDVI/EVI/SAVI + SAR
backscatter time-series) and flags deviations as an "Anomaly Score" (0-100).

This is a transformer-encoder operating over a sliding window of a farm's
multi-variate satellite time-series. It is trained as a self-supervised
forecaster: predict the next time-step's indices from the recent past.
Large prediction error (vs. actual observed values) = anomaly.

Requirements
------------
    pip install torch pytorch-lightning numpy pandas scikit-learn --break-system-packages

Training data
--------------
Bootstrapped from historical Sentinel-1/2 series (see sentinel_processing.py)
pulled via Google Earth Engine for ~100+ known Telangana field locations,
spanning 5 years. See `train_on_public_data.py` for the bootstrap strategy
using public datasets before PJTAU field data is available.
========================================================================
"""

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import pytorch_lightning as pl
from torch.utils.data import Dataset, DataLoader


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
@dataclass
class STConfig:
    n_features: int = 6          # NDVI, EVI, SAVI, VV, VH, VV_VH_ratio
    seq_len: int = 12            # lookback window (~ 12 satellite passes, ~5-10 days apart)
    pred_len: int = 1            # forecast horizon (next pass)
    d_model: int = 64
    n_heads: int = 4
    n_layers: int = 3
    dim_feedforward: int = 256
    dropout: float = 0.1
    lr: float = 1e-3


# --------------------------------------------------------------------------
# Dataset: sliding windows over per-farm satellite time-series
# --------------------------------------------------------------------------
class FieldTimeSeriesDataset(Dataset):
    """
    Expects a DataFrame with columns:
        farm_id, date, NDVI, EVI, SAVI, VV, VH, VV_VH_ratio
    Produces (input_window, target_next_step) pairs per farm, normalized
    per-farm to remove field-specific baseline offset.
    """

    FEATURE_COLS = ["NDVI", "EVI", "SAVI", "VV", "VH", "VV_VH_ratio"]

    def __init__(self, df: pd.DataFrame, cfg: STConfig):
        self.cfg = cfg
        self.samples = []
        self.farm_stats = {}

        for farm_id, group in df.groupby("farm_id"):
            group = group.sort_values("date").reset_index(drop=True)
            values = group[self.FEATURE_COLS].interpolate().bfill().ffill().values.astype(np.float32)
            if len(values) < cfg.seq_len + cfg.pred_len:
                continue

            mean, std = values.mean(axis=0), values.std(axis=0) + 1e-6
            self.farm_stats[farm_id] = (mean, std)
            normed = (values - mean) / std

            for i in range(len(normed) - cfg.seq_len - cfg.pred_len + 1):
                window = normed[i: i + cfg.seq_len]
                target = normed[i + cfg.seq_len: i + cfg.seq_len + cfg.pred_len]
                self.samples.append((window, target, farm_id))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        window, target, farm_id = self.samples[idx]
        return torch.tensor(window), torch.tensor(target)


# --------------------------------------------------------------------------
# Model: Transformer encoder forecaster
# --------------------------------------------------------------------------
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 100):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, : x.size(1)]


class SpatioTemporalTransformer(pl.LightningModule):
    """
    Self-supervised transformer that forecasts next-step vegetation/SAR
    indices from a lookback window. The reconstruction/forecast error at
    inference time becomes the anomaly score.
    """

    def __init__(self, cfg: STConfig):
        super().__init__()
        self.save_hyperparameters()
        self.cfg = cfg

        self.input_proj = nn.Linear(cfg.n_features, cfg.d_model)
        self.pos_encoding = PositionalEncoding(cfg.d_model, max_len=cfg.seq_len + cfg.pred_len)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=cfg.d_model,
            nhead=cfg.n_heads,
            dim_feedforward=cfg.dim_feedforward,
            dropout=cfg.dropout,
            batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=cfg.n_layers)
        self.output_proj = nn.Linear(cfg.d_model, cfg.n_features)
        self.loss_fn = nn.MSELoss(reduction="none")

    def forward(self, x):
        # x: (batch, seq_len, n_features)
        h = self.input_proj(x)
        h = self.pos_encoding(h)
        h = self.encoder(h)
        # Use last timestep's hidden state to forecast next step
        pred = self.output_proj(h[:, -1:, :])
        return pred  # (batch, pred_len, n_features)

    def training_step(self, batch, batch_idx):
        x, y = batch
        pred = self(x)
        loss = self.loss_fn(pred, y).mean()
        self.log("train_loss", loss, prog_bar=True)
        return loss

    def validation_step(self, batch, batch_idx):
        x, y = batch
        pred = self(x)
        loss = self.loss_fn(pred, y).mean()
        self.log("val_loss", loss, prog_bar=True)
        return loss

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.cfg.lr, weight_decay=1e-5)

    @torch.no_grad()
    def anomaly_score(self, x: torch.Tensor, y_true: torch.Tensor) -> torch.Tensor:
        """
        Returns a 0-100 anomaly score per sample based on forecast error,
        scaled by the per-feature error distribution observed during
        validation (a calibration table should be persisted alongside the
        model checkpoint in production).
        """
        self.eval()
        pred = self(x)
        per_feature_error = (pred - y_true).pow(2).squeeze(1)  # (batch, n_features)
        raw_score = per_feature_error.mean(dim=-1)  # (batch,)
        # Squash into 0-100 using a sigmoid-like transform; replace `k` with
        # a value calibrated on held-out validation error distribution.
        k = 5.0
        score = 100 * (1 - torch.exp(-k * raw_score))
        return score


# --------------------------------------------------------------------------
# Training entry point
# --------------------------------------------------------------------------
def train_anomaly_model(train_df: pd.DataFrame, val_df: pd.DataFrame, cfg: Optional[STConfig] = None,
                         max_epochs: int = 50, ckpt_path: str = "anomaly_model.ckpt"):
    cfg = cfg or STConfig()
    train_ds = FieldTimeSeriesDataset(train_df, cfg)
    val_ds = FieldTimeSeriesDataset(val_df, cfg)

    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=64, shuffle=False, num_workers=2)

    model = SpatioTemporalTransformer(cfg)
    trainer = pl.Trainer(
        max_epochs=max_epochs,
        accelerator="auto",
        callbacks=[pl.callbacks.EarlyStopping(monitor="val_loss", patience=8)],
        log_every_n_steps=10,
    )
    trainer.fit(model, train_loader, val_loader)
    trainer.save_checkpoint(ckpt_path)
    return model


if __name__ == "__main__":
    # Smoke test with synthetic data — replace with real Sentinel pull in production.
    rng = np.random.default_rng(42)
    dates = pd.date_range("2020-01-01", periods=400, freq="6D")
    rows = []
    for farm_id in [f"farm_{i:03d}" for i in range(20)]:
        base = rng.normal(0.6, 0.05)
        for d in dates:
            seasonal = 0.15 * np.sin(2 * np.pi * d.dayofyear / 365)
            rows.append({
                "farm_id": farm_id, "date": d,
                "NDVI": base + seasonal + rng.normal(0, 0.02),
                "EVI": base * 0.8 + seasonal + rng.normal(0, 0.02),
                "SAVI": base * 0.9 + seasonal + rng.normal(0, 0.02),
                "VV": -12 + rng.normal(0, 1), "VH": -18 + rng.normal(0, 1),
                "VV_VH_ratio": 0.6 + rng.normal(0, 0.05),
            })
    df = pd.DataFrame(rows)
    split = df["date"] < "2020-10-01"
    model = train_anomaly_model(df[split], df[~split], max_epochs=3)
    print("Smoke test complete — model trained on synthetic data.")
