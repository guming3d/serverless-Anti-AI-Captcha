FROM pytorch/pytorch:1.7.1-cuda11.0-cudnn8-runtime

WORKDIR /app

#RUN yum install -y tar gzip unzip openssl awk
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y --no-install-recommends tar
RUN apt-get install -y --no-install-recommends curl
RUN apt-get install -y --no-install-recommends gzip
RUN apt-get install -y --no-install-recommends unzip
RUN apt-get install -y --no-install-recommends openssl
RUN apt-get install -y --no-install-recommends gawk
RUN apt-get install -y --no-install-recommends parallel

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws/

COPY container.d/generate-captcha-data/cnn_models/__init__.py  /app/cnn_models/
COPY container.d/generate-captcha-data/cnn_models/models.py  /app/cnn_models/
COPY container.d/generate-captcha-data/fonts/Baoli.ttc  /app/fonts/
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
COPY container.d/generate-captcha-data/captcha-calling-wrapper.py  /app/
COPY container.d/generate-captcha-data/upload-to-S3-ddb.sh  /app/

RUN cd /app && pip install -r requirements.txt -i https://opentuna.cn/pypi/web/simple

RUN mkdir -p /app/data/
RUN mkdir -p /app/data/adv_char_images
RUN mkdir -p /app/data/captcha_images
RUN mkdir -p /app/data/raw_char_images
RUN mkdir -p /app/data/trained_models

ENTRYPOINT ["python", "/app/captcha-calling-wrapper.py"]
