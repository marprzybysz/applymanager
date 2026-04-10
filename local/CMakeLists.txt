cmake_minimum_required(VERSION 3.16)
project(ApplyManagerLocal LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(applymanager_local
  src/main.cpp
  src/MainWindow.cpp
  src/MainWindow.h
)

target_link_libraries(applymanager_local PRIVATE Qt6::Widgets)
