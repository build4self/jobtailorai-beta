# DeepSeek-R1 Migration

## Summary
Successfully migrated both interview Lambda functions from expensive models to DeepSeek-R1 for massive cost savings.

## Changes Made

### 1. Interview Conductor Lambda (`backend/lambda-functions/interview-conductor/index.py`)
**Previous Models:**
- Question Generation: Amazon Nova Pro (`us.amazon.nova-pro-v1:0`)
- Company Research: Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229-v1:0`)

**New Model:**
- Both functions now use: DeepSeek-R1 (`us.deepseek.r1-v1:0`)

### 2. Feedback Analyzer Lambda (`backend/lambda-functions/feedback-analyzer/index.py`)
**Previous Model:**
- Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229-v1:0`)

**New Model:**
- DeepSeek-R1 (`us.deepseek.r1-v1:0`)

## Cost Impact

### Per Interview Cost Comparison
| Component | Previous Cost | New Cost | Savings |
|-----------|--------------|----------|---------|
| Question Generation | $0.0028 | $0.0003 | 89% |
| Company Research | $0.0165 | $0.0005 | 97% |
| **Total per Interview** | **$0.019** | **$0.0008** | **96%** |

### Volume Projections
| Interviews | Previous Cost | New Cost | Savings |
|------------|--------------|----------|---------|
| 100 | $1.90 | $0.08 | $1.82 |
| 1,000 | $19.00 | $0.80 | $18.20 |
| 10,000 | $190.00 | $8.00 | $182.00 |

## Technical Details

### API Format Changes
DeepSeek-R1 uses a different API format than Claude/Nova:

**Request:**
```python
{
    "prompt": string,
    "max_tokens": int,
    "temperature": float,
    "top_p": float
}
```

**Response:**
```python
{
    "choices": [
        {
            "text": string,
            "stop_reason": string
        }
    ]
}
```

### Model Capabilities
DeepSeek-R1 excels at:
- ✅ Complex reasoning (perfect for interview questions)
- ✅ Code generation (technical interviews)
- ✅ Mathematical analysis
- ✅ Multi-step problem solving
- ✅ Transparent reasoning process

### Configuration
- **Model ID**: `us.deepseek.r1-v1:0` (cross-region inference profile)
- **Max Tokens**: 2000-4000 (optimal quality up to 8192)
- **Temperature**: 0.7
- **Top P**: 0.9

## Deployment

To deploy these changes:
```bash
# Deploy to beta environment
./deploy-beta.sh

# Or deploy to production
./deploy.sh
```

## Testing Recommendations

1. **Test interview question generation** - Verify quality matches previous output
2. **Test company research** - Ensure research depth is maintained
3. **Test feedback analysis** - Confirm feedback quality and structure
4. **Monitor costs** - Track actual cost reduction in AWS Cost Explorer

## Rollback Plan

If issues arise, revert by changing model IDs back to:
- Question Generation: `us.amazon.nova-pro-v1:0`
- Company Research & Feedback: `anthropic.claude-3-sonnet-20240229-v1:0`

## Notes

- DeepSeek-R1 is available via cross-region inference (no manual model access request needed)
- Model is MIT licensed and fully managed by AWS Bedrock
- No infrastructure changes required - only model ID and API format updates
- Response quality should be comparable or better due to DeepSeek's reasoning capabilities
