resource "aws_dynamodb_table" "contacts" {
  name         = "${var.prefix}-contacts-leads"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name        = "${var.prefix}-contacts"
    Environment = var.environment 
  }
}

#
## Leaderboard table optimized for cheap reads/writes
## Partition by game type, one item per player per game
## Design: Update player's best score only if it improved (conditional write)
#resource "aws_dynamodb_table" "decision_game_leaderboard" {
#  name         = "${var.prefix}-decision-game-leaderboard"
#  billing_mode = "PAY_PER_REQUEST"
#
#  hash_key  = "game_type"
#  range_key = "player_id"
#
#  attribute {
#    name = "game_type"
#    type = "S"
#  }
#
#  attribute {
#    name = "player_id"
#    type = "S"
#  }
#
#  attribute {
#    name = "best_score_rank"
#    type = "N"
#  }
#
#  global_secondary_index {
#    name            = "GameTypeScoreIndex"
#    projection_type = "ALL"
#
#    key_schema {
#      attribute_name = "game_type"
#      key_type       = "HASH"
#    }
#
#    key_schema {
#      attribute_name = "best_score_rank"
#      key_type       = "RANGE"
#    }
#  }
#
#  ttl {
#    attribute_name = "expiration_time"
#    enabled        = false
#  }
#
#  tags = {
#    Name        = "${var.prefix}-leaderboard"
#    Environment = var.environment
#  }
#}
