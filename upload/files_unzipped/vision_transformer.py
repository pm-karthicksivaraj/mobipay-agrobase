"""
vision_transformer.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: Model 3 — Vision Transformer (ViT) — Ground-Truth Pest/Disease
        Validation, exported to TensorFlow Lite for offline on-device
        inference in the Flutter Field Staff app.

Strategy
--------
Stage A (Day 1 / cold start): Fine-tune a pretrained ViT-B/16 (ImageNet
weights) on the PUBLIC PlantVillage dataset (~54,000 labeled leaf images,
38 crop-disease classes) plus, where licensing allows, ICAR/regional
open datasets. This gives ~75-85% baseline accuracy on common
disease/pest visual signatures.

Stage B (ongoing, post-pilot-launch): Continuously fine-tune on
PJTAU/field-staff-labeled Telangana-specific photos collected via the
feedback loop (Sprint 7 in the execution plan), closing the domain gap
to local pest variants, lighting conditions, and phone camera profiles.

Requirements
------------
    pip install torch torchvision timm scikit-learn pillow --break-system-packages
    pip install tensorflow onnx onnx-tf --break-system-packages   # for TFLite export

Public dataset
--------------
    PlantVillage: https://www.kaggle.com/datasets/emmarex/plantdisease
    (Verify license terms before commercial redistribution; dataset is
    commonly used for academic/research benchmarking — confirm terms for
    production deployment.)
========================================================================
"""

from dataclasses import dataclass, field
from typing import List

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import timm  # provides pretrained ViT backbones


@dataclass
class ViTConfig:
    backbone: str = "vit_base_patch16_224"
    pretrained: bool = True
    num_classes: int = 38          # PlantVillage class count; remap for Telangana-specific taxonomy later
    img_size: int = 224
    lr: float = 3e-5
    batch_size: int = 32
    epochs_head_only: int = 5      # freeze backbone, train classifier head
    epochs_finetune: int = 10      # unfreeze top blocks, fine-tune end-to-end
    class_names: List[str] = field(default_factory=list)


def build_dataloaders(data_dir: str, cfg: ViTConfig):
    """
    data_dir should follow ImageFolder layout:
        data_dir/train/<class_name>/*.jpg
        data_dir/val/<class_name>/*.jpg
    For PlantVillage, split 80/20 train/val per class before calling this.
    """
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(cfg.img_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((cfg.img_size, cfg.img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_ds = datasets.ImageFolder(f"{data_dir}/train", transform=train_tf)
    val_ds = datasets.ImageFolder(f"{data_dir}/val", transform=val_tf)
    cfg.class_names = train_ds.classes
    cfg.num_classes = len(train_ds.classes)

    train_loader = DataLoader(train_ds, batch_size=cfg.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=cfg.batch_size, shuffle=False, num_workers=4)
    return train_loader, val_loader


def build_model(cfg: ViTConfig) -> nn.Module:
    model = timm.create_model(cfg.backbone, pretrained=cfg.pretrained, num_classes=cfg.num_classes)
    return model


def freeze_backbone(model: nn.Module):
    for name, param in model.named_parameters():
        if "head" not in name and "fc" not in name:
            param.requires_grad = False


def unfreeze_top_blocks(model: nn.Module, n_blocks: int = 2):
    """Unfreeze the last N transformer blocks for fine-tuning (timm ViT layout: model.blocks)."""
    if hasattr(model, "blocks"):
        for block in list(model.blocks)[-n_blocks:]:
            for param in block.parameters():
                param.requires_grad = True
    for param in model.head.parameters():
        param.requires_grad = True


def train_one_epoch(model, loader, optimizer, loss_fn, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = loss_fn(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += images.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, loss_fn, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = loss_fn(outputs, labels)
        total_loss += loss.item() * images.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()
        total += images.size(0)
    return total_loss / total, correct / total


def train_vit(data_dir: str, cfg: ViTConfig, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
    train_loader, val_loader = build_dataloaders(data_dir, cfg)
    model = build_model(cfg).to(device)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Stage A: head-only training (fast convergence, prevents catastrophic
    # forgetting of ImageNet features while adapting the classifier).
    freeze_backbone(model)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
    for epoch in range(cfg.epochs_head_only):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, optimizer, loss_fn, device)
        val_loss, val_acc = evaluate(model, val_loader, loss_fn, device)
        print(f"[head-only {epoch+1}/{cfg.epochs_head_only}] "
              f"train_loss={tr_loss:.4f} train_acc={tr_acc:.4f} val_loss={val_loss:.4f} val_acc={val_acc:.4f}")

    # Stage B: unfreeze top blocks, fine-tune at low LR.
    unfreeze_top_blocks(model, n_blocks=2)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=cfg.lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=cfg.epochs_finetune)
    best_val_acc = 0.0
    for epoch in range(cfg.epochs_finetune):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, optimizer, loss_fn, device)
        val_loss, val_acc = evaluate(model, val_loader, loss_fn, device)
        scheduler.step()
        print(f"[finetune {epoch+1}/{cfg.epochs_finetune}] "
              f"train_loss={tr_loss:.4f} train_acc={tr_acc:.4f} val_loss={val_loss:.4f} val_acc={val_acc:.4f}")
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), "vit_best.pt")

    print(f"Training complete. Best val_acc={best_val_acc:.4f}. Checkpoint: vit_best.pt")
    return model


# --------------------------------------------------------------------------
# Export to TensorFlow Lite for on-device (offline) inference
# --------------------------------------------------------------------------
def export_to_tflite(pt_checkpoint: str, cfg: ViTConfig, onnx_path: str = "vit_model.onnx",
                      tflite_path: str = "vit_model.tflite"):
    """
    Pipeline: PyTorch (.pt) -> ONNX -> TensorFlow SavedModel -> TFLite (int8
    quantized) for low-latency, low-battery on-device inference in Flutter
    via the `tflite_flutter` plugin.

    Quantization keeps the model small (~25-40MB -> ~8-12MB) and fast
    enough to run on mid-range Android devices used by field staff.
    """
    model = build_model(cfg)
    model.load_state_dict(torch.load(pt_checkpoint, map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 3, cfg.img_size, cfg.img_size)
    torch.onnx.export(
        model, dummy_input, onnx_path,
        input_names=["input"], output_names=["output"],
        opset_version=13,
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    )
    print(f"Exported ONNX model to {onnx_path}")

    # Convert ONNX -> TF SavedModel -> TFLite. Requires `onnx-tf` and `tensorflow`.
    try:
        import onnx
        from onnx_tf.backend import prepare
        import tensorflow as tf

        onnx_model = onnx.load(onnx_path)
        tf_rep = prepare(onnx_model)
        saved_model_dir = "vit_saved_model"
        tf_rep.export_graph(saved_model_dir)

        converter = tf.lite.TFLiteConverter.from_saved_model(saved_model_dir)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]  # post-training quantization
        tflite_model = converter.convert()

        with open(tflite_path, "wb") as f:
            f.write(tflite_model)
        print(f"Exported quantized TFLite model to {tflite_path}")
    except ImportError as exc:
        print(f"Skipping TFLite conversion (missing dependency): {exc}. "
              f"Install `onnx-tf` and `tensorflow` to complete this step.")


if __name__ == "__main__":
    print(
        "This module expects a PlantVillage-formatted dataset directory.\n"
        "Example:\n"
        "  python vision_transformer.py  # then call train_vit('data/plantvillage', ViTConfig())\n"
        "See train_on_public_data.py for the end-to-end bootstrap pipeline."
    )
