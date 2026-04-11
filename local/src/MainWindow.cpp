#include "MainWindow.h"

#include <QDialog>
#include <QDialogButtonBox>
#include <QFormLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
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
  addOfferButton_ = new QPushButton("Dodaj", headerBox);
  auto* importButton = new QPushButton("Import", headerBox);

  headerLayout->addWidget(subtitle, 1);
  headerLayout->addWidget(importButton);
  headerLayout->addWidget(addOfferButton_);

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

  connect(addOfferButton_, &QPushButton::clicked, this, &MainWindow::toggleAddOfferDialog);

  connect(importButton, &QPushButton::clicked, this, [this]() {
    statusLabel_->setText("TODO: import Excel z backendu /api/offers/import-excel");
  });
}

void MainWindow::loadDemoData() {
  offersList_->addItem("Senior Frontend Developer @ Example Co");
  offersList_->addItem("QA Engineer @ Test Labs");
  offersList_->addItem("DevOps Engineer @ Infra Team");
}

void MainWindow::toggleAddOfferDialog() {
  ensureAddOfferDialog();
  if (!addOfferDialog_) {
    return;
  }

  if (addOfferDialog_->isVisible()) {
    addOfferDialog_->hide();
    addOfferButton_->setText("Dodaj");
    statusLabel_->setText("Okno dodawania oferty zamkniete.");
    return;
  }

  addOfferDialog_->show();
  addOfferDialog_->raise();
  addOfferDialog_->activateWindow();
  addOfferButton_->setText("Zamknij dodawanie");
  statusLabel_->setText("Okno dodawania oferty otwarte.");
}

void MainWindow::ensureAddOfferDialog() {
  if (addOfferDialog_) {
    return;
  }

  addOfferDialog_ = new QDialog(this);
  addOfferDialog_->setWindowTitle("Dodaj Oferte");
  addOfferDialog_->setModal(false);
  addOfferDialog_->resize(460, 260);

  auto* layout = new QVBoxLayout(addOfferDialog_);
  auto* form = new QFormLayout();

  auto* companyInput = new QLineEdit(addOfferDialog_);
  auto* roleInput = new QLineEdit(addOfferDialog_);
  auto* linkInput = new QLineEdit(addOfferDialog_);
  linkInput->setPlaceholderText("https://...");

  form->addRow("Firma", companyInput);
  form->addRow("Stanowisko", roleInput);
  form->addRow("Link", linkInput);
  layout->addLayout(form);

  auto* buttons = new QDialogButtonBox(addOfferDialog_);
  auto* saveButton = buttons->addButton("Dodaj", QDialogButtonBox::AcceptRole);
  auto* closeButton = buttons->addButton("Zamknij", QDialogButtonBox::RejectRole);
  layout->addWidget(buttons);

  connect(saveButton, &QPushButton::clicked, this, [this, companyInput, roleInput]() {
    const QString company = companyInput->text().trimmed();
    const QString role = roleInput->text().trimmed();
    if (!company.isEmpty() && !role.isEmpty()) {
      offersList_->addItem(role + " @ " + company);
      statusLabel_->setText("Dodano oferte lokalnie (scaffold).");
    } else {
      statusLabel_->setText("Uzupelnij pola Firma i Stanowisko.");
      return;
    }
    addOfferDialog_->hide();
    addOfferButton_->setText("Dodaj");
  });

  connect(closeButton, &QPushButton::clicked, addOfferDialog_, &QDialog::hide);
  connect(addOfferDialog_, &QDialog::finished, this, [this]() {
    addOfferButton_->setText("Dodaj");
    statusLabel_->setText("Okno dodawania oferty zamkniete.");
  });
}
