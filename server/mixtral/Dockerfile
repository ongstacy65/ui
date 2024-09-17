FROM python:3.11

# Set working directory
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    HF_TOKEN="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"

RUN pip install --upgrade pip
RUN pip install --no-cache-dir instructlab==0.16.1

# Copy project files to the working directory
COPY config.yaml .

RUN ilab download --repository=TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF --filename=mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf

# Copy project files to the working directory
COPY . .

EXPOSE 8000

# Run the chat server with the specified model family and model file
CMD ["ilab", "serve", "--model-path", "mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf"]



