#pragma once

#include <QMainWindow>

class QListWidget;
class QLabel;

class MainWindow final : public QMainWindow {
  Q_OBJECT

public:
  explicit MainWindow(QWidget* parent = nullptr);

private:
  QListWidget* offersList_ = nullptr;
  QLabel* statusLabel_ = nullptr;

  void setupUi();
  void loadDemoData();
};
