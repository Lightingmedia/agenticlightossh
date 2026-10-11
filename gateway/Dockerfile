FROM nvidia/cuda:12.4.1-base-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
COPY lightos_gateway ./lightos_gateway

RUN useradd -r -u 10001 gateway && mkdir -p /data && chown gateway /data
USER gateway
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fs http://127.0.0.1:8080/healthz || exit 1
CMD ["python3", "-m", "uvicorn", "lightos_gateway.app:main_app", "--factory", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
