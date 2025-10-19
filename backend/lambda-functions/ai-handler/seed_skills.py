#!/usr/bin/env python3
"""
Seed Skills Database Script

This script seeds the DynamoDB skills table with initial common skills.
Run this after deploying the infrastructure to populate the skills database.

Usage:
    python seed_skills.py --environment prod
    python seed_skills.py --environment dev
"""

import boto3
import argparse
import os
import sys
from skills_manager import SkillsManager

def main():
    parser = argparse.ArgumentParser(description='Seed the skills database with initial skills')
    parser.add_argument('--environment', '-e', required=True, 
                       choices=['dev', 'test', 'prod'],
                       help='Environment to seed (dev, test, prod)')
    parser.add_argument('--region', '-r', default='us-east-1',
                       help='AWS region (default: us-east-1)')
    
    args = parser.parse_args()
    
    # Set up AWS session
    session = boto3.Session(region_name=args.region)
    
    # Construct table name
    table_name = f'resume-optimizer-skills-{args.environment}'
    
    print(f"Seeding skills database: {table_name}")
    print(f"Region: {args.region}")
    print(f"Environment: {args.environment}")
    
    try:
        # Check if table exists
        dynamodb = session.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Try to describe the table to verify it exists
        table.load()
        print(f"✓ Table {table_name} found")
        
        # Initialize skills manager
        skills_manager = SkillsManager(table_name)
        
        # Check if table is already seeded
        existing_skills = skills_manager.get_all_skills_by_category()
        if existing_skills:
            print(f"⚠️  Table already contains {len(existing_skills)} skills")
            response = input("Do you want to add initial skills anyway? (y/N): ")
            if response.lower() != 'y':
                print("Skipping seeding.")
                return
        
        # Seed the database
        print("🌱 Seeding initial skills...")
        skills_manager.seed_initial_skills()
        
        # Verify seeding
        all_skills = skills_manager.get_all_skills_by_category()
        skills_by_category = {}
        for skill in all_skills:
            category = skill.get('category', 'general')
            if category not in skills_by_category:
                skills_by_category[category] = 0
            skills_by_category[category] += 1
        
        print(f"✅ Successfully seeded {len(all_skills)} skills!")
        print("\nSkills by category:")
        for category, count in sorted(skills_by_category.items()):
            print(f"  {category}: {count} skills")
        
        print(f"\n🎉 Skills database {table_name} is ready!")
        
    except Exception as e:
        print(f"❌ Error seeding skills database: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
