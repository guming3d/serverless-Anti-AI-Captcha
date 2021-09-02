ARG VERSION=3.8

FROM alpine as builder
RUN mkdir -p /data/site-packages/

FROM public.ecr.aws/lambda/python:${VERSION}

RUN yum install -y tar gzip unzip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws/
RUN python -m pip install --user boto3

COPY container.d/load-captcha-data/bulk-load.py container.d/load-captcha-data/prepare-data.sh /app/
COPY --from=builder /data/site-packages/ /var/lang/lib/python3.8/site-packages/
ENTRYPOINT ["python", "/app/bulk-load.py"]

