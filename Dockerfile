# Dockhold builds this image and runs it as a non-root user (uid 1001).
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies from the lockfile, in their own layer so a
# code-only change doesn't reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Exec form, so node is PID 1 and gets stop signals directly. server.js reads
# process.env.PORT itself, so nothing needs shell expansion here.
CMD ["node", "server.js"]
