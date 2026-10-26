@echo off
title Petty Expense - Backend Server
echo ========================================================
echo Starting Django REST Backend on http://127.0.0.1:8000
echo ========================================================
cd /d %~dp0
call .venv\Scripts\activate.bat
cd backend
python manage.py runserver 127.0.0.1:8000
pause

