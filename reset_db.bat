@echo off
echo 데이터베이스를 재생성합니다...
echo.
echo 주의: Flask 서버를 먼저 종료하세요 (Ctrl+C)
echo.
pause

cd /d %~dp0
if exist instance\database.db (
    del /f instance\database.db
    echo 데이터베이스 파일이 삭제되었습니다.
) else (
    echo 데이터베이스 파일이 없습니다.
)

echo.
echo 이제 python run.py를 실행하면 새로운 데이터베이스가 생성됩니다.
pause

