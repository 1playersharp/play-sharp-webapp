#output "frontend_url" {
#  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
#}

output "backend_url" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

#output "cloudfront_url" {
#  value = aws_cloudfront_distribution.frontend.domain_name
#}

#output "cloudfront_id" {
#  value = aws_cloudfront_distribution.frontend.id
#}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "contact_table_name" {
  value       = aws_dynamodb_table.contacts.name
  description = "DynamoDB contacts table name"
}

output "contact_table_arn" {
  value       = aws_dynamodb_table.contacts.arn
  description = "DynamoDB contacts table ARN"
}