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

data "aws_iam_policy_document" "leaderboard_policy_document" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:PutItem",
      "dynamodb:BatchWriteItem"
    ]
    resources = [
      aws_dynamodb_table.decision_game_leaderboard.arn,
      aws_dynamodb_table.club_claims.arn,
      "${aws_dynamodb_table.decision_game_leaderboard.arn}/index/*"
    ]
  }
}

data "aws_iam_policy_document" "frontend_policy" {
  statement {
    actions   = [
      "s3:GetObject"
    ]
    resources = [
      aws_s3_bucket.frontend.arn,
      "${aws_s3_bucket.frontend.arn}/*"
    ]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [
        aws_cloudfront_distribution.frontend.arn
      ]
    }
  }
}