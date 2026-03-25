module.exports = {
  apps: [
    {
      name: "bio-simulation-prod",
      script: "tsx",
      args: "server.ts",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G"
    }
  ]
};
