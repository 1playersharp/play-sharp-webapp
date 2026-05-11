terraform {
  backend "s3" {
    bucket         = "demo-play-sharp-app"
    key            = "infra/demo-play-sharp/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
  }
}