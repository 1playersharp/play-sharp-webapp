terraform {
  backend "s3" {
    bucket         = "demo-play-smart-app"
    key            = "infra/demo-play-smart/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
  }
}