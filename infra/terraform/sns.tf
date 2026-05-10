resource "aws_sns_topic" "contact_leads" {
  name = "${var.prefix}-contact-leads-topic"
}