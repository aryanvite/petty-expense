@echo off
title Petty Expense - Frontend Dev Server
echo ========================================================
echo Starting Vite React Frontend on http://localhost:5173
echo ========================================================
cd /d %~dp0\frontend
npm run dev
pause

