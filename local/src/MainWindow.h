#pragma once

#include <QMainWindow>

class QListWidget;
class QLabel;
class QPushButton;
class QDialog;

class MainWindow final : public QMainWindow {
  Q_OBJECT

public:
  explicit MainWindow(QWidget* parent = nullptr);

private:
  QListWidget* offersList_ = nullptr;
  QLabel* statusLabel_ = nullptr;
  QPushButton* addOfferButton_ = nullptr;
  QDialog* addOfferDialog_ = nullptr;

  void setupUi();
  void loadDemoData();
  void toggleAddOfferDialog();
  void ensureAddOfferDialog();
};
