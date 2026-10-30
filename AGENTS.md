# noCoder canvas

This repository is the application canvas, isolated from the control application and its queue. Implement user requests in this repository; never change the separate control repository or its Worker. Preserve the fullscreen canvas and existing app features. Canvas and app APIs run on the `nocoder-canvas` Worker, with separate storage and secrets. Avoid paid services unless explicitly configured. Do not access, expose or log secrets.

The control system submits one Jules session at a time. Follow the deployment instructions supplied in the task prompt. Commit first, run `NC_JOB_ID=... NC_DEPLOY_TOKEN=... npm run deploy:jules`, and create a PR with exactly the deployed tree. Never merge it yourself. If changes are made after publishing, commit and deploy again. Preserve the task authorization privately; never include it in commits, logs or PRs.
