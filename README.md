# 台南市房價監測系統

台南市房市資訊整合平台，自動爬取內政部實價登錄資料，支援建案搜尋、價格比較、歷史走勢分析與電子郵件通知。

> **This project was built using [Superpowers for Claude Code](https://github.com/superpowers-ai/superpowers) — a plugin that enables structured, plan-driven development with subagent-driven implementation, spec reviews, and code quality reviews at every step.**

## 功能

- 建案搜尋（依行政區、類型、關鍵字）
- 交易紀錄瀏覽與價格統計
- 多建案比較
- 歷史均價走勢圖
- 電子郵件價格到價通知

## 技術棧

| 層級 | 技術 |
|------|------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Leaflet |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| Task Queue | Celery + Redis |
| Database | PostgreSQL 16 |
| Email | Resend |
| Infrastructure | Docker Compose |

## 快速啟動

```bash
cp backend/.env.example backend/.env
# 填入 RESEND_API_KEY 等環境變數

docker compose up --build
```

服務啟動後：

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001/docs

## 資料來源

內政部不動產成交案件實際資訊資料供應系統（實價登錄）開放資料，每日凌晨 3 點自動更新。
