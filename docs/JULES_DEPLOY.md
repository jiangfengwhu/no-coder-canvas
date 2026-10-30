# 画板发布

先提交源码，再使用任务提示中给出的 NC_JOB_ID 和 NC_DEPLOY_TOKEN 执行 npm run deploy:jules。脚本从控制 Worker 获取当前任务的发布凭据，检查、构建并部署画板 Worker，随后验证线上 commit、tree 和任务 ID。不要打印或保存凭据、不要将任务授权写入仓库或 PR。

确认发布成功后创建针对 main 的 PR，不要自行合并。如有后续修改，重新提交并部署。只操作画板仓库与画板 Worker；队列和控制系统由独立仓库维护。应用业务 API 在 backend/src/app.ts。
