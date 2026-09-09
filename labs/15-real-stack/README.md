# Lab 15：真实技术栈部署骨架

这是从“标准库教学实现”进入真实工程的桥梁。目录提供一个不包含密钥的服务骨架：FastAPI 接入请求，LangGraph 承载可恢复流程，PostgreSQL 保存业务状态，Redis 用于短期队列/锁，Qdrant 保存向量索引，OpenTelemetry 负责 trace。

## 启动基础设施

```bash
cp labs/15-real-stack/.env.example labs/15-real-stack/.env
docker compose -f labs/15-real-stack/docker-compose.yml up -d postgres redis qdrant
python3 -m compileall labs/15-real-stack/app
```

## 责任边界

| 组件 | 保存/负责 | 不应该负责 |
| --- | --- | --- |
| PostgreSQL | 用户、项目、任务、receipt | 向量近邻排序 |
| Redis | lease、短期队列、速率限制 | 唯一业务事实 |
| Qdrant | embedding、payload、过滤检索 | 权限裁决 |
| LangGraph | state、节点、interrupt、checkpoint | 自动保证外部副作用幂等 |
| OTel/Langfuse | trace、span、token/cost 属性 | 业务数据主存储 |

生产启动前必须补：鉴权、数据库 migration、tenant filter、secret manager、限流、备份、告警和 CI 评测门禁。不要把 `.env` 提交到仓库。
