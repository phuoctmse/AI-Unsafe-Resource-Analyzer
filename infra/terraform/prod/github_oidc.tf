variable "github_repo" {
  description = "GitHub repo theo format 'owner/repo'"
  type        = string
  default     = "phuoctmse/AI-Unsafe-Resource-Analyzer"
}

# OIDC Provider — tạo 1 lần per account
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint (stable)
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM Role — GitHub Actions assume role này khi deploy
resource "aws_iam_role" "github_deploy" {
  name = "${local.name_prefix}-github-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/main"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = { Name = "${local.name_prefix}-github-deploy-role" }
}

# Policy — chỉ đủ quyền để push ECR + deploy ECS
resource "aws_iam_role_policy" "github_deploy" {
  name = "ecr-push-ecs-deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
      {
        Sid    = "ECSDeployAndWait"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ecs:cluster" = aws_ecs_cluster.main.arn
          }
        }
      },
    ]
  })
}

output "github_deploy_role_arn" {
  description = "Paste vào GitHub Secret AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_deploy.arn
}
