import pandas as pd
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import json
import re
import os

# Data Models
class Impact(BaseModel):
    profit: int = 0
    dataQuality: int = 0
    cdoBudget: int = 0
    clientRelationship: int = 0

class Outcome(BaseModel):
    description: str
    impact: Impact = Field(default_factory=Impact)
    next: List[str] = Field(default_factory=list)

class Choice(BaseModel):
    name: str
    text: str
    outcome: Outcome

class Node(BaseModel):
    name: str
    end: bool = False
    default: bool = False
    sender: str
    title: str
    content: str
    category: str
    isUrgent: bool = False
    choices: Dict[str, Choice]
    minClientRelationship: Optional[int] = None
    maxDataQuality: Optional[int] = None

class Indicator(BaseModel):
    name: str
    nameId: str
    emoji: str
    initial: int
    min: int
    max: int
    type: str
    displayed: bool
    color: str

class Medal(BaseModel):
    name: str
    threshold: int
    emoji: str

class CardContext(BaseModel):
    program: str = ""
    domains: str = ""
    roleFocus: str = ""
    objective: str = ""

class CardMetadata(BaseModel):
    category: str = ""
    estimatedDurationMinutes: int = 0
    track: str = ""

class Card(BaseModel):
    plan: str = "free"
    title: str = ""
    shortDescription: str = ""
    difficulty: str = ""
    skillsAcquired: List[str] = Field(default_factory=list)
    context: CardContext = Field(default_factory=CardContext)
    metadata: CardMetadata = Field(default_factory=CardMetadata)

class Scenario(BaseModel):
    nodes: List[Node]
    priority: int = 1
    indicators: List[Indicator]
    nameId: str
    library: List[Any] = Field(default_factory=list)
    medals: List[Medal]
    card: Card

# Helper function for node name
def clean_title(title: str) -> str:
    s = title.lower()
    s = s.replace(" ", "_")
    s = re.sub(r'[?!.]', '', s)
    s = re.sub(r'[^\w_]', '', s)
    return s

# Load Data
filepath = 'amplify/static/ingest/emails_v2.xlsx'
# Ensure we are in the root or adjust path. The script is in scripts/ingest/main.py.
if not os.path.exists(filepath):
    # Try relative to script location if running from there
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Assuming amplify is at root, and script is at scripts/ingest
    # root is ../../
    root_dir = os.path.abspath(os.path.join(script_dir, '../../'))
    filepath = os.path.join(root_dir, 'amplify/static/ingest/emails_v2.xlsx')

print(f"Reading from {filepath}")
df = pd.read_excel(filepath, sheet_name='Edited CDO Statements')

columns = ["Review",	
           "Use?",
           "Label",
           "Key",
           "Name",
           "Category",
           "Sender",
           "Min Reputation",
           "Max Data Quality",
           "Title","Content","Option 1","Outcome 1",
           "Outcome 1 Budget Impact",
           "Outcome 1 Profit Impact",
           "Outcome 1 Data Quality Impact",
           "Outcome 1 Reputation Impact",
           "Option 2","Outcome 2",
           "Outcome 2 Budget Impact",
           "Outcome 2 Profit Impact",
           "Outcome 2 Data Quality Impact",
           "Outcome 2 Reputation Impact",
           "Option 3","Outcome 3","Outcome 3 Budget Impact",
           "Outcome 3 Profit Impact",
           "Outcome 3 Data Quality Impact",
           "Outcome 3 Reputation Impact"]
df = df[df["Use?"] == "Y"][columns]

nodes = []
for index, row in df.iterrows():
    choices = {}
    for i in range(1, 4):
        option_col = f'Option {i}'
        outcome_col = f'Outcome {i}'
        
        if option_col not in row or pd.isna(row[option_col]):
            continue
            
        # Parse impacts
        impact = Impact()
        
        # Budget
        col = f'Outcome {i} Budget Impact'
        if col in row and pd.notna(row[col]):
            impact.cdoBudget = 10000*int(row[col])
            
        # Profit
        col = f'Outcome {i} Profit Impact'
        if col in row and pd.notna(row[col]):
            impact.profit = 10000*int(row[col])
            
        # Data Quality
        col = f'Outcome {i} Data Quality Impact'
        if col in row and pd.notna(row[col]):
            impact.dataQuality = int(row[col])
            
        # Client Relationship
        col = f'Outcome {i} Reputation Impact'
        if col in row and pd.notna(row[col]):
            impact.clientRelationship = int(row[col])

        choices[str(i)] = Choice(
            name=str(i),
            text=str(row[option_col]),
            outcome=Outcome(
                description=str(row[outcome_col]) if outcome_col in row and pd.notna(row[outcome_col]) else "",
                impact=impact
            )
        )
    
    node = Node(
        name=clean_title(str(row['Title'])),
        default=(index == 0), # First node is default
        sender=str(row['Sender']),
        title=str(row['Title']),
        content=str(row['Content']),
        category=str(row['Category']),
        choices=choices,
        minClientRelationship=int(row['Min Reputation']) if pd.notna(row['Min Reputation']) else None,
        maxDataQuality=int(row['Max Data Quality']) if pd.notna(row['Max Data Quality']) else None
    )
    nodes.append(node)

# Indicators
indicators = [
    Indicator(name="Profit", nameId="profit", emoji="📈", initial=0, min=-10000000, max=10000000, type="dollars", displayed=True, color="primary"),
    Indicator(name="Data Quality", nameId="dataQuality", emoji="📊", initial=50, min=0, max=100, type="percentage", displayed=True, color="primary"),
    Indicator(name="CDO Budget", nameId="cdoBudget", emoji="💰", initial=1000000, min=0, max=10000000, type="dollars", displayed=False, color="#9c27b0"),
    Indicator(name="Client Relationship", nameId="clientRelationship", emoji="🤝", initial=50, min=0, max=100, type="percentage", displayed=False, color="#9c27b0")
]

# Medals
medals = [
    Medal(name="gold", threshold=3500, emoji="🥇"),
    Medal(name="silver", threshold=2000, emoji="🥈"),
    Medal(name="bronze", threshold=500, emoji="🥉")
]

# Card
card = Card(
    title="Who can lead with data?",
    shortDescription="",
    difficulty="",
    context=CardContext(),
    metadata=CardMetadata()
)

scenario = Scenario(
    nodes=nodes,
    priority=2,
    indicators=indicators,
    nameId="who_can_lead",
    library=[],
    medals=medals,
    card=card
)

# Save
output_path = 'amplify/static/scenarios/who_can_lead.json'
# Adjust output path if needed
if not os.path.exists(os.path.dirname(output_path)):
     # Try relative to root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, '../../'))
    output_path = os.path.join(root_dir, 'amplify/static/scenarios/who_can_lead.json')

with open(output_path, 'w') as f:
    f.write(scenario.model_dump_json(indent=2))

print(f"Scenario saved to {output_path}")