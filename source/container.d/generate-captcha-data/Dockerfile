ARG VERSION=3.8

FROM alpine as builder
RUN mkdir -p /data/site-packages/

FROM public.ecr.aws/lambda/python:${VERSION}

RUN yum install -y tar gzip unzip openssl awk
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws/
RUN python -m pip install --user boto3

COPY container.d/generate-captcha-data/cnn_models/__init__.py  /app/cnn_models/
COPY container.d/generate-captcha-data/cnn_models/models.py  /app/cnn_models/
COPY container.d/generate-captcha-data/fonts/Baoli.ttc  /app/fronts/
COPY container.d/generate-captcha-data/__init__.py  /app/cnn_models/
COPY container.d/generate-captcha-data/basis_img_gen.py  /app/
COPY container.d/generate-captcha-data/captcha_composite.py  /app/
COPY container.d/generate-captcha-data/captcha_main.py  /app/
COPY container.d/generate-captcha-data/cnn_model_noising.py  /app/
COPY container.d/generate-captcha-data/cnn_model_train.py  /app/
COPY container.d/generate-captcha-data/configures.py  /app/
COPY container.d/generate-captcha-data/dataset.py  /app/
COPY container.d/generate-captcha-data/formula_converter.py  /app/
COPY container.d/generate-captcha-data/formula_gen.py  /app/
COPY container.d/generate-captcha-data/requirements.txt  /app/
COPY container.d/generate-captcha-data/utils.py  /app/
COPY --from=builder /data/site-packages/ /var/lang/lib/python3.8/site-packages/
ENTRYPOINT ["python", "/app/captcha_main.py"]

