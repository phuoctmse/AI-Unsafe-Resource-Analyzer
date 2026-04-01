output "state_bucket_name" {
  value       = aws_s3_bucket.tfstate.bucket
  description = "S3 bucket name for Terraform remote state"
}

output "lock_table_name" {
  value       = aws_dynamodb_table.tfstate_lock.name
  description = "DynamoDB table name for state locking"
}

output "backend_config_snippet" {
  value = <<-EOT
    # Paste this into infra/terraform/prod/main.tf → backend "s3" block:
    bucket         = "${aws_s3_bucket.tfstate.bucket}"
    key            = "prod/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "${aws_dynamodb_table.tfstate_lock.name}"
  EOT
  description = "Ready-to-paste backend config snippet for prod"
}
