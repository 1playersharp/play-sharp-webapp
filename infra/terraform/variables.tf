variable "environment" {
  type = string
  description = "The environment to deploy to (e.g., dev, staging, prod)"
  default = "dev"
}

variable "aws_region" {
  type = string
  description = "The AWS region to deploy to"
  default = "eu-west-2"
}

variable "prefix" {
  type = string
  description = "The prefix name of the application"
  default = "playsharp"
}

variable "s3_index_file" {
  type = string
  description = "The name of the index html file"
  default = "index.html"
}

# LAMBDA

variable "lambda_runtime" {
  type = string
  description = "The runtime for Lambda Function"
  default = "python3.12"
}

#BACKEND API LAMBDA

variable "backend_lambda_file_path" {
  type = string
  description = "backend_lambda_file_path"
  default ="/../../backend"
}

variable "backend_lambda_output_file_path" {
  type = string
  description = "backend_lambda_output_file_path"
  default = "/lambda/backend/backend"
}

variable "backend_lambda_handler" {
  type = string
  description = "The backend lambda handler"
  default = "backend_py.handler"
}

#CONTACT LEADS

variable "contact_lead_file_path" {
  type = string
  description = "contact_lead_file_path"
  default = "/../../backend/contact"
}

variable "contact_leads_output_file_path" {
  type = string
  description = "contact_leads_output_file_path"
  default = "/lambda/playsharp-contacts/playsharp-contacts"
}

variable "contact_lambda_handler" {
  type = string
  description = "The contact lambda handler"
  default = "contact.lambda_handler"
}

variable "cors_origins" {
  type = string
  description = "The cors origin"
  default = "*"
}

variable "db_name" {
  type = string
  description = "The MongoDB database name"
  default = "PlayerLeaderboard"
}

