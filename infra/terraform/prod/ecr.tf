locals {
  ecr_repos = ["frontend", "backend", "worker"]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.ecr_repos)
  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each = aws_ecr_repository.services

  repository = each.value.name

  policy = <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last ${var.ecr_image_retention_count} tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v", "sha-"],
        "countType": "imageCountMoreThan",
        "countNumber": ${var.ecr_image_retention_count}
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF
}
