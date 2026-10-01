#!/usr/bin/env python3
"""
Quick health check for the ML training pipeline.
Verifies all dependencies and dataset before training.
"""

import logging
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_dependencies():
    """Verify all required packages are installed."""
    logger.info('Checking dependencies...')
    required = [
        'torch',
        'transformers',
        'pandas',
        'sklearn',
        'joblib',
        'langdetect'
    ]
    
    for pkg in required:
        try:
            __import__(pkg)
            logger.info('✓ %s', pkg)
        except ImportError:
            logger.error('✗ Missing: %s', pkg)
            return False
    
    return True


def check_files():
    """Verify all required files exist."""
    logger.info('Checking files...')
    
    required_files = [
        'config.py',
        'preprocess.py',
        'train.py',
        'evaluate.py',
        'inference.py',
        'dataset_validation.py',
        'model_mine/dataset.csv'
    ]
    
    all_exist = True
    for f in required_files:
        path = Path(f)
        if path.exists():
            logger.info('✓ %s', f)
        else:
            logger.error('✗ Missing: %s', f)
            all_exist = False
    
    return all_exist


def check_dataset():
    """Verify dataset can be loaded."""
    logger.info('Checking dataset...')
    try:
        import pandas as pd
        df = pd.read_csv('model_mine/dataset.csv')
        logger.info('✓ Dataset loaded: %d rows', len(df))
        logger.info('  Columns: %s', list(df.columns))
        logger.info('  Labels: %s', df['label'].value_counts().to_dict())
        return True
    except Exception as e:
        logger.error('✗ Dataset error: %s', e)
        return False


def main():
    logger.info('=' * 60)
    logger.info('ML PIPELINE HEALTH CHECK')
    logger.info('=' * 60)
    
    checks = [
        ('Dependencies', check_dependencies),
        ('Files', check_files),
        ('Dataset', check_dataset),
    ]
    
    all_passed = True
    for name, check_fn in checks:
        logger.info('')
        if not check_fn():
            all_passed = False
    
    logger.info('')
    logger.info('=' * 60)
    if all_passed:
        logger.info('✓ ALL CHECKS PASSED - Ready to train!')
        logger.info('Run: python train.py')
        return 0
    else:
        logger.error('✗ Some checks failed - Fix issues above')
        return 1
    logger.info('=' * 60)


if __name__ == '__main__':
    sys.exit(main())
