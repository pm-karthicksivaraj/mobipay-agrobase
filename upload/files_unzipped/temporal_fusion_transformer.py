"""
temporal_fusion_transformer.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: Model 2 — Temporal Fusion Transformer (TFT) — Pest/Disease Risk Forecast

Purpose
-------
Fuses the anomaly score from Model 1 with weather forecast variables and
crop growth stage to output a calibrated probability of a pest/disease
outbreak over the next 7-14 days, per pest class.

IMPORTANT (addresses a known gap from earlier review):
This model is NOT bootstrapped from PlantVillage — that dataset is leaf
imagery with no time-series/weather structure, and cannot pretrain a
TFT. Until PJTAU historical outbreak logs are available, this model is
cold-started using:
  1. Synthetic/heuristic labels derived from published agronomic
     thresholds (e.g., ICAR/PJTAU PoP literature: "high humidity +
     flowering stage => elevated bollworm risk").
  2. Open agro-meteorological outbreak datasets where available
     (e.g., ICAR-NCIPM pest surveillance data, India Meteorological
     Department + state pest-trap records, if obtainable).
  3. PJTAU's real historical outbreak logs, once provided, become the
     primary fine-tuning signal (see train_on_public_data.py Stage 3).

Until step 3, treat this model's outputs as a *prior*, gated behind the
deterministic Knowledge Graph / PoP rule engine for actual advisory
generation — never expose raw model probability to a farmer without the
rule-engine sanity check.

Requirements
------------
    pip install pytorch-forecasting pytorch-lightning torch pandas --break-system-packages
========================================================================
"""

from dataclasses import dataclass, field
from typing import List

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import pytorch_lightning as pl
from torch.utils.data import Dataset, DataLoader


@dataclass
class TFTConfig:
    static_features: List[str] = field(default_factory=lambda: ["crop_type", "agro_climatic_zone"])
    time_varying_known: List[str] = field(default_factory=lambda: [
        "humidity", "temperature", "rainfall_mm", "crop_stage_encoded", "day_of_season"
    ])
    time_varying_unknown: List[str] = field(default_factory=lambda: ["anomaly_score"])
    pest_classes: List[str] = field(default_factory=lambda: [
        "stem_borer", "bollworm", "blast", "aphid", "none"
    ])
    seq_len: int = 14
    horizon: int = 10
    d_model: int = 48
    n_heads: int = 4
    lr: float = 5e-4


class PestRiskDataset(Dataset):
    """
    Expects a DataFrame indexed by (farm_id, date) with columns matching
    TFTConfig feature lists, plus a `pest_label` column for supervised
    fine-tuning (one of cfg.pest_classes) once real/heuristic labels exist.
    """

    def __init__(self, df: pd.DataFrame, cfg: TFTConfig, label_col: str = "pest_label"):
        self.cfg = cfg
        self.samples = []
        feature_cols = cfg.time_varying_known + cfg.time_varying_unknown
        label_map = {c: i for i, c in enumerate(cfg.pest_classes)}

        for farm_id, group in df.groupby("farm_id"):
            group = group.sort_values("date").reset_index(drop=True)
            feats = group[feature_cols].interpolate().bfill().ffill().values.astype(np.float32)
            labels = group[label_col].map(label_map).fillna(label_map["none"]).values.astype(np.int64)

            if len(feats) < cfg.seq_len + 1:
                continue
            for i in range(len(feats) - cfg.seq_len):
                window = feats[i: i + cfg.seq_len]
                target = labels[i + cfg.seq_len]  # label at the day right after the window
                self.samples.append((window, target))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        window, target = self.samples[idx]
        return torch.tensor(window), torch.tensor(target)


class GatedResidualNetwork(nn.Module):
    """Simplified GRN block, core building unit of TFT-style architectures."""

    def __init__(self, d_model: int, dropout: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(d_model, d_model)
        self.elu = nn.ELU()
        self.fc2 = nn.Linear(d_model, d_model)
        self.gate = nn.Linear(d_model, d_model)
        self.norm = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        h = self.fc2(self.elu(self.fc1(x)))
        g = torch.sigmoid(self.gate(x))
        out = self.norm(x + self.dropout(g * h))
        return out


class PestRiskTFT(pl.LightningModule):
    """
    Lightweight TFT-style model: variable-selection-esque input embedding,
    GRN blocks, multi-head temporal self-attention, classification head
    over pest classes (last class = "no elevated risk").
    """

    def __init__(self, cfg: TFTConfig, n_input_features: int):
        super().__init__()
        self.save_hyperparameters()
        self.cfg = cfg

        self.input_proj = nn.Linear(n_input_features, cfg.d_model)
        self.grn1 = GatedResidualNetwork(cfg.d_model)
        attn_layer = nn.TransformerEncoderLayer(
            d_model=cfg.d_model, nhead=cfg.n_heads, dim_feedforward=cfg.d_model * 4, batch_first=True
        )
        self.temporal_attn = nn.TransformerEncoder(attn_layer, num_layers=2)
        self.grn2 = GatedResidualNetwork(cfg.d_model)
        self.classifier = nn.Linear(cfg.d_model, len(cfg.pest_classes))
        self.loss_fn = nn.CrossEntropyLoss()

    def forward(self, x):
        h = self.input_proj(x)
        h = self.grn1(h)
        h = self.temporal_attn(h)
        h = self.grn2(h)
        pooled = h[:, -1, :]  # last timestep summarizes the window
        logits = self.classifier(pooled)
        return logits

    def training_step(self, batch, batch_idx):
        x, y = batch
        logits = self(x)
        loss = self.loss_fn(logits, y)
        self.log("train_loss", loss, prog_bar=True)
        return loss

    def validation_step(self, batch, batch_idx):
        x, y = batch
        logits = self(x)
        loss = self.loss_fn(logits, y)
        acc = (logits.argmax(-1) == y).float().mean()
        self.log("val_loss", loss, prog_bar=True)
        self.log("val_acc", acc, prog_bar=True)
        return loss

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.cfg.lr, weight_decay=1e-5)

    @torch.no_grad()
    def predict_risk(self, x: torch.Tensor) -> dict:
        """Returns a {pest_class: probability} dict for a single window batch."""
        self.eval()
        logits = self(x)
        probs = torch.softmax(logits, dim=-1)
        return {cls: probs[:, i].tolist() for i, cls in enumerate(self.cfg.pest_classes)}


# --------------------------------------------------------------------------
# Heuristic label generator (cold-start, pre-PJTAU-data labeling strategy)
# --------------------------------------------------------------------------
def heuristic_pest_labels(df: pd.DataFrame) -> pd.Series:
    """
    Generates weak/heuristic labels from published agronomic thresholds,
    to be used ONLY for cold-start pretraining before PJTAU historical
    outbreak data is available. These rules should be reviewed and
    signed off by a PJTAU entomologist/pathologist before use — they are
    illustrative defaults, not validated thresholds.

    Example rule (cotton bollworm): high humidity + flowering stage +
    negative NDVI anomaly => elevated risk.
    """
    label = pd.Series("none", index=df.index)

    bollworm_mask = (
        (df.get("crop_type") == "cotton")
        & (df.get("crop_stage_encoded") == 3)  # e.g. 3 = flowering, per crop-calendar encoding
        & (df.get("humidity", 0) > 75)
        & (df.get("anomaly_score", 0) > 50)
    )
    label[bollworm_mask] = "bollworm"

    stem_borer_mask = (
        (df.get("crop_type") == "paddy")
        & (df.get("crop_stage_encoded") == 2)  # e.g. 2 = tillering
        & (df.get("humidity", 0) > 80)
        & (df.get("anomaly_score", 0) > 45)
    )
    label[stem_borer_mask] = "stem_borer"

    return label


if __name__ == "__main__":
    rng = np.random.default_rng(7)
    n = 3000
    df = pd.DataFrame({
        "farm_id": rng.integers(0, 30, n).astype(str),
        "date": pd.date_range("2021-06-01", periods=n, freq="D")[: n],
        "crop_type": rng.choice(["cotton", "paddy", "maize"], n),
        "crop_stage_encoded": rng.integers(0, 5, n),
        "humidity": rng.uniform(40, 95, n),
        "temperature": rng.uniform(20, 38, n),
        "rainfall_mm": rng.exponential(5, n),
        "day_of_season": rng.integers(0, 120, n),
        "anomaly_score": rng.uniform(0, 100, n),
    })
    df["pest_label"] = heuristic_pest_labels(df)

    cfg = TFTConfig()
    ds = PestRiskDataset(df, cfg)
    loader = DataLoader(ds, batch_size=32, shuffle=True)
    model = PestRiskTFT(cfg, n_input_features=len(cfg.time_varying_known + cfg.time_varying_unknown))
    trainer = pl.Trainer(max_epochs=2, accelerator="auto", log_every_n_steps=5)
    trainer.fit(model, loader)
    print("Smoke test complete — TFT cold-start trained on heuristic labels.")
