# 展会线索采集与业务员战报系统

面向展会现场的线索采集、业务员归属、后台战报和企业微信群机器人播报系统。

## 技术栈

- 前端：React 19 + Vite + TypeScript
- 后端：Node.js + Express + TypeScript
- ORM：Prisma
- 本地数据库：SQLite（免安装，适合演示和开发）
- 生产数据库：建议 PostgreSQL
- Excel 导出：ExcelJS
- 二维码：QRCode
- 定时任务：node-cron

## 项目结构

```text
client/                 前端：客户登记页 + 管理后台
server/                 后端 API + 定时播报服务
server/prisma/schema.prisma
                        数据库表结构
server/prisma/seed.ts   演示数据
```

## 环境变量

不要提交真实 `.env`、密钥、数据库密码、企业微信 Webhook、微信 appsecret。

本仓库只提交示例文件：

- `server/.env.example`
- `client/.env.example`

本地运行时复制示例文件：

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

重要变量：

- `DATABASE_URL`：本地默认 `file:./dev.db`
- `JWT_SECRET`：JWT 签名密钥，生产环境必须改成强随机值
- `APP_SECRET`：数据库加密字段密钥，生产环境必须改成强随机值
- `WEWORK_WEBHOOK_URL`：企业微信群机器人 Webhook，可留空，也可在后台加密保存
- `VITE_API_BASE`：前端请求后端的地址

## 安装依赖

在项目根目录执行：

```bash
npm install
```

## 数据库初始化

本地开发使用 SQLite，不需要安装数据库软件。

```bash
npm run prisma:generate --workspace server
npx prisma db push --schema server/prisma/schema.prisma
npm run db:seed --workspace server
```

种子数据会创建演示账号：

- 管理员：`admin@example.com` / `Admin123!`
- 业务员：`sales@example.com` / `Sales123!`
- 电话跟进：`follow@example.com` / `Follow123!`

## 启动方式

### 同时启动前端和后端

```bash
npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:4000`

### 单独启动后端

```bash
npm run dev --workspace server
```

### 单独启动前端

```bash
npm run dev --workspace client
```

## 构建检查

```bash
npm run build
```

## 已有功能

- 管理员创建展会活动
- 管理员添加业务员
- 为每个业务员生成随机 token 专属二维码
- 客户扫码进入登记表
- 客户提交姓名、手机号、公司、职位、微信号、感兴趣产品、采购意向、备注、后续联系授权
- 后端根据 token 自动归属业务员，不暴露 `salesId`
- 手机号按“活动 + 手机号”去重，重复登记会更新资料但保持原归属
- 管理后台查看全部线索
- 按业务员、采购意向、跟进状态筛选
- Excel 导出
- 数据看板：今日总线索、业务员线索数、排行榜、高意向客户、目标完成率
- 基础权限：管理员、业务员、电话跟进人员
- 线索状态：未跟进、已电话、有意向、无效、已报价、已成交
- 跟进记录表：电话结果、状态、下次跟进时间
- 企业微信 Webhook 环境变量配置或后台加密保存
- 每 2 小时自动发送业务员线索排行榜
- 每天展会结束时间自动发送当天总结
- 管理员设置次日早上提醒内容并定时发送

## 未完成功能 / 后续建议

- 正式生产部署脚本和服务器进程守护
- PostgreSQL 生产迁移文件
- 更细粒度的 RBAC 权限配置
- 登录验证码、密码重置、账号禁用
- 线索批量导入
- 客户隐私合规文本自定义
- 企业微信发送失败重试和发送日志页面
- 多活动跨天统计报表

## 数据库表结构

数据库 schema 已提交：

```text
server/prisma/schema.prisma
```

当前本地开发使用 SQLite。正式部署建议切换 PostgreSQL，并使用 Prisma migration 管理生产数据库变更。

## 安全说明

- `.env` 不提交。
- 本地 SQLite 数据库文件不提交。
- 企业微信 Webhook 不暴露给前端。
- 二维码使用随机 token，不直接暴露业务员 ID。
- 后台保存 Webhook 时使用 AES-256-GCM 加密。
