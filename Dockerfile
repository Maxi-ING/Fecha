FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
VOLUME ["/app/.data"]
EXPOSE 3000
CMD ["npm", "start"]
