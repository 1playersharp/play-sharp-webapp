
# POLICIES

resource "aws_iam_policy" "lambda_contact_leads_policy" {
  name = "${var.prefix}-contact-leads-lambda-policy"
  policy = data.aws_iam_policy_document.documentdb.json
}

resource "aws_iam_policy" "lambda_leaderboard_policy" {
  name = "${var.prefix}-lambda-leaderboard-policy"
  policy = data.aws_iam_policy_document.leaderboard_policy_document.json
}

#ROLES

resource "aws_iam_role" "lambda_backend_default_role" {
  name = "${var.prefix}-lambda-backend-default-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_default_exec.json
}

#ATTACH

resource "aws_iam_role_policy_attachment" "attach_backend_default" {
  role               = aws_iam_role.lambda_backend_default_role.name
  policy_arn         = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "attach_backend_leaderboard" {
  role       = aws_iam_role.lambda_backend_default_role.name
  policy_arn = aws_iam_policy.lambda_leaderboard_policy.arn
}

resource "aws_iam_role_policy_attachment" "attach_backend_contact" {
  role       = aws_iam_role.lambda_backend_default_role.name
  policy_arn = aws_iam_policy.lambda_contact_leads_policy.arn
}