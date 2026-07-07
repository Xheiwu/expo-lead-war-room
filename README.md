# 展会线索采集与业务员战报系统

面向展会现场的线索采集、业务员归属、后台战报和企业微信群机器人播报系统。

## 技术栈

- 前端：React 19 + Vite + TypeScript
- 后端：Node.js + Express + TypeScript
- ORM：Prisma
- 本地开发数据库：SQLite（免安装）
- 生产数据库：PostgreSQL
- Excel 导出：ExcelJS
- 二维码：QRCode
- 定时任务：node-cron
- 部署：Docker + Docker Compose + Nginx

## 项目结构

```text
client/                         前端：客户登记页 + 管理后台
client/src/api/client.ts         API 客户端
client/src/components/           后台组件
client/src/pages/RegisterPage.tsx 客户扫码登记页
server/                         后端 API + 定时播报服务
server/src/routes/              路由
server/src/services/            业务服务
server/src/utils/               通用工具
server/prisma/schema.prisma     本地 SQLite 开发 schema
server/prisma.postgres/         生产 PostgreSQL schema 和 migration
```

## 环境变量

不要提交真实 `.env`、密钥、数据库密码、企业微信 Webhook、微信 appsecret。

示例文件：

- `server/.env.example`：本地开发
- `server/.env.production.example`：生产部署
- `client/.env.example`
- `client/.env.production.example`

## 本地开发：SQLite

适合本机演示和功能开发，不需要安装数据库。

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
npx prisma db push --schema server/prisma/schema.prisma
npm run db:seed --workspace server
npm run dev
```

访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:4000`

演示账号：

- 管理员：`admin@example.com` / `Admin123!`
- 业务员：`sales@example.com` / `Sales123!`
- 电话跟进：`follow@example.com` / `Follow123!`

## 单独启动

后端：

```bash
npm run dev --workspace server
```

前端：

```bash
npm run dev --workspace client
```

## 生产数据库：PostgreSQL

生产 schema：

```text
server/prisma.postgres/schema.prisma
```

生产 migration：

```text
server/prisma.postgres/migrations/202607070001_initial/migration.sql
```

迁移命令：

```bash
npx prisma migrate deploy --schema server/prisma.postgres/schema.prisma
```

## Docker 部署

1. 准备生产环境变量：

```bash
copy server\.env.production.example server\.env.production
```

2. 修改 `server/.env.production`：

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_SECRET`
- `CLIENT_ORIGIN`
- `PUBLIC_CLIENT_URL`
- `WEWORK_WEBHOOK_URL`

3. 启动：

```bash
docker compose up -d --build
```

默认访问：

```text
http://服务器IP:8080
```

## 构建检查

```bash
npm run build
```

## 已有功能

- 管理员创建、编辑、启用、停用展会活动
- 活动配置播报时间段、每日总结时间、隐私文本
- 管理员添加、编辑、启停业务员
- 为业务员生成随机 token 专属二维码
- 二维码重新生成、单个 PNG 下载、批量下载
- 客户扫码进入登记表
- 客户提交姓名、手机号、公司、职位、微信号、感兴趣产品、采购意向、备注、后续联系授权
- 登记页 honeypot 防简单机器人
- 公开登记接口 IP 限流和 token 限流
- 手机号严格校验
- 后端根据 token 自动归属业务员，不暴露 `salesId`
- 手机号按“活动 + 手机号”去重，重复登记会更新资料但保持原归属
- 线索支持编辑、删除、标记无效、标记垃圾/可疑
- 后台查看线索并按业务员、采购意向、跟进状态、垃圾标记筛选
- Excel 导出，包含跟进状态、最近跟进内容、下次跟进时间、格式化提交时间
- 数据看板：今日线索、累计线索、今日高意向、累计高意向、目标完成率
- 业务员排行榜同时显示今日数量和累计数量
- 基础权限：管理员、业务员、电话跟进人员
- 线索状态：未跟进、已电话、有意向、无效、已报价、已成交
- 跟进记录表：电话结果、状态、下次跟进时间
- 企业微信 Webhook 环境变量配置或后台加密保存
- 每 2 小时按活动时间和播报时段发送“今日线索排行”
- 每日总结使用当天数据并避免重复发送
- 企业微信发送日志 `BotMessageLog`
- 企业微信失败自动重试最多 3 次
- 后台发送日志页面

## 未完成功能 / 后续建议

- 更完整的操作审计日志
- 更细粒度的 RBAC 权限配置
- 登录验证码、密码重置、账号禁用
- 线索批量导入
- 二维码批量 ZIP 下载
- 企业微信发送失败人工重发按钮
- 多活动跨天趋势图和渠道分析
- 单元测试与端到端测试

## 安全说明

- `.env` 不提交。
- 本地 SQLite 数据库文件不提交。
- 企业微信 Webhook 不暴露给前端。
- 二维码使用随机 token，不直接暴露业务员 ID。
- 后台保存 Webhook 时使用 AES-256-GCM 加密。
