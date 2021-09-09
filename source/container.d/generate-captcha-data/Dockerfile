FROM pytorch/pytorch:latest

WORKDIR /app

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
COPY container.d/generate-captcha-data/captcha-calling-wrapper.py  /app/
COPY container.d/generate-captcha-data/upload-to-S3.sh  /app/

RUN cd /app && pip install -r requirements.txt

ENTRYPOINT ["python", "/app/captcha-calling-wrapper.py"]

