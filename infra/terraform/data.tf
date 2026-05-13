data "aws_iam_policy_document" "documentdb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Scan"
    ]
    resources = [
      aws_dynamodb_table.contacts.arn
    ]
  }
  statement {
    effect = "Allow"
    actions = [
       "sns:Publish"
    ]
    resources = [
      aws_sns_topic.contact_leads.arn
    ]
  }

}

data "aws_iam_policy_document" "lambda_default_exec" {
  statement {
    effect = "Allow"
    principals {
      identifiers = ["lambda.amazonaws.com"]
      type = "Service"
    }
    actions = [
      "sts:AssumeRole"
    ]
  }
}

data "aws_ssm_parameter" "mongo_uri" {
  name = "/playsharp/mongo_uri"
}

data "aws_ssm_parameter" "db_name" {
  name = "/playsharp/db_name"
}

#data "aws_iam_policy_document" "frontend_policy" {
#  statement {
#    actions   = [
#      "s3:GetObject"
#    ]
#    resources = [
#      aws_s3_bucket.frontend.arn,
#      "${aws_s3_bucket.frontend.arn}/*"
#    ]
#
#    principals {
#      type        = "Service"
#      identifiers = ["cloudfront.amazonaws.com"]
#    }
#
#    condition {
#      test     = "StringEquals"
#      variable = "AWS:SourceArn"
#      values   = [
#        aws_cloudfront_distribution.frontend.arn
#      ]
#    }
#  }
#}