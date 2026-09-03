FROM node:22-alpine AS build
ARG CACHEBUST=2
WORKDIR /app
RUN npm install -g npm@latest
COPY package.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g npm@latest
COPY package.json ./
RUN npm install --include=dev
COPY --from=build /app/dist ./dist
COPY drizzle.config.ts ./
COPY db ./db
EXPOSE 3000
CMD ["npm", "start"]
