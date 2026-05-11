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

output "leaderboard_table_name" {
  value       = aws_dynamodb_table.decision_game_leaderboard.name
  description = "DynamoDB leaderboard table name"
}

output "leaderboard_table_arn" {
  value       = aws_dynamodb_table.decision_game_leaderboard.arn
  description = "DynamoDB leaderboard table ARN"
}