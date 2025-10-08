FROM node:22-alpine as builder

WORKDIR app 

COPY package*.json .

RUN ["npm","ci","--only=dev"]


FROM node:22-alpine 

WORKDIR /app 
COPY . .
COPY --from=builder /app/node_modules . 
EXPOSE 3000
CMD ["npm","start"]





