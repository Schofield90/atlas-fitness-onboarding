FROM n8nio/n8n:latest

USER root

# Install additional packages if needed
RUN apk add --no-cache \
    git \
    openssh-client

USER node

# Copy custom nodes or configurations if needed
# COPY --chown=node:node ./custom-nodes /home/node/.n8n/custom

EXPOSE 5678

CMD ["n8n"]