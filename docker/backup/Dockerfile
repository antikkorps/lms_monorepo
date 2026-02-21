FROM alpine:3.19

RUN apk add --no-cache \
    postgresql16-client \
    rclone \
    bash \
    gzip

COPY deploy/scripts/backup.sh /usr/local/bin/backup.sh
COPY deploy/scripts/restore.sh /usr/local/bin/restore.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh

# Cron: daily at 03:00 UTC
RUN echo "0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" \
    | crontab -

CMD ["crond", "-f", "-d", "8"]
