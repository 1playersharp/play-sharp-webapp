# resource "aws_s3_bucket" "frontend" {
#   bucket = "${var.prefix}-app-frontend"
# }
# 
# resource "aws_s3_bucket_public_access_block" "frontend" {
#   bucket = aws_s3_bucket.frontend.id
# 
#   block_public_acls       = false
#   block_public_policy     = false
#   ignore_public_acls      = false
#   restrict_public_buckets = false
# }
# 
# resource "aws_s3_bucket_website_configuration" "frontend" {
#   bucket = aws_s3_bucket.frontend.id
# 
#   index_document {
#     suffix = var.s3_index_file
#   }
# 
#   error_document {
#     key = var.s3_index_file
#   }
# }
# 
# resource "aws_s3_bucket_policy" "frontend" {
#   bucket = aws_s3_bucket.frontend.id
#   policy = data.aws_iam_policy_document.frontend_policy.json
# }