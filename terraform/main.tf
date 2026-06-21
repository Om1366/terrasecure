resource "aws_s3_bucket" "terrasecure_bucket" {
  bucket = "terrasecure-devops-demo-bucket-2026"

  tags = {
    Name = "TerraSecure"
    Environment = "Dev"
  }
}