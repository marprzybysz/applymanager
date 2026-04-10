#include "MainWindow.h"

#include <QGroupBox>
#include <QHBoxLayout>
#include <QLabel>
#include <QListWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

MainWindow::MainWindow(QWidget* parent) : QMainWindow(parent) {
  setupUi();
  loadDemoData();
}

void MainWindow::setupUi() {
  setWindowTitle("ApplyManager (Local Qt)");
  resize(980, 640);

  auto* root = new QWidget(this);
  auto* page = new QVBoxLayout(root);
  page->setContentsMargins(16, 16, 16, 16);
  page->setSpacing(12);

  auto* headerBox = new QGroupBox("ApplyManager", root);
  auto* headerLayout = new QHBoxLayout(headerBox);

  auto* subtitle = new QLabel("Local UI scaffold aligned with web layout.", headerBox);
  auto* addOfferButton = new QPushButton("Dodaj", headerBox);
  auto* importButton = new QPushButton("Import", headerBox);

  headerLayout->addWidget(subtitle, 1);
  headerLayout->addWidget(importButton);
  headerLayout->addWidget(addOfferButton);

  auto* statusBox = new QGroupBox("Status", root);
  auto* statusLayout = new QHBoxLayout(statusBox);
  statusLabel_ = new QLabel("Ready", statusBox);
  statusLayout->addWidget(statusLabel_);

  auto* offersBox = new QGroupBox("Offers", root);
  auto* offersLayout = new QVBoxLayout(offersBox);
  offersList_ = new QListWidget(offersBox);
  offersLayout->addWidget(offersList_);

  page->addWidget(headerBox);
  page->addWidget(statusBox);
  page->addWidget(offersBox, 1);

  setCentralWidget(root);

  connect(addOfferButton, &QPushButton::clicked, this, [this]() {
    statusLabel_->setText("TODO: modal dodawania oferty (link + zapis)");
  });

  connect(importButton, &QPushButton::clicked, this, [this]() {
    statusLabel_->setText("TODO: import Excel z backendu /api/offers/import-excel");
  });
}

void MainWindow::loadDemoData() {
  offersList_->addItem("Senior Frontend Developer @ Example Co");
  offersList_->addItem("QA Engineer @ Test Labs");
  offersList_->addItem("DevOps Engineer @ Infra Team");
}
