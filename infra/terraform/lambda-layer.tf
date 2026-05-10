resource "aws_lambda_layer_version" "backend_deps" {
  layer_name = "${var.prefix}-backend-deps"

  filename         = "${path.module}/lambda/lambda-layer/playsharp-backend-layer.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/lambda-layer/playsharp-backend-layer.zip")

  compatible_runtimes = ["python3.11", "python3.12"]
}