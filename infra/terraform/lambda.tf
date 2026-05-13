# BACKEND APP LAMBDA

resource "aws_lambda_function" "backend" {
  function_name = "${var.prefix}-backend-api"

  role    = aws_iam_role.lambda_backend_default_role.arn
  handler = var.backend_lambda_handler
  runtime = var.lambda_runtime

  filename         = "${path.module}/lambda/backend/playsharp-backend.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/backend/playsharp-backend.zip")

  timeout = 30
  memory_size = 2048

  layers = [
    aws_lambda_layer_version.backend_deps.arn
  ]

  environment {
    variables = {
      # MONGO_URL    = var.mongo_url
      # DB_NAME      = var.db_name
      CORS_ORIGINS = var.cors_origins
      CONTACTS_TABLE = aws_dynamodb_table.contacts.name
      SNS_TOPIC_ARN = aws_sns_topic.contact_leads.arn
    }
  }

}



