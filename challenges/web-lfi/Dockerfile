FROM node:20-alpine
WORKDIR /app
COPY server.js /app/server.js
RUN mkdir -p /pages && echo "Welcome to our site!" > /pages/home.txt && echo "About us page" > /pages/about.txt
ENV FLAG=flag{default_flag}
EXPOSE 80
CMD ["sh", "-c", "echo $FLAG > /flag && node /app/server.js"]
